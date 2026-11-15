package com.kamalkavin96.opendrive_backend.service;

import com.kamalkavin96.opendrive_backend.config.StorageProperties;
import com.kamalkavin96.opendrive_backend.dto.response.FileResponse;
import com.kamalkavin96.opendrive_backend.entity.FileMetadata;
import com.kamalkavin96.opendrive_backend.entity.Folder;
import com.kamalkavin96.opendrive_backend.exception.BadRequestException;
import com.kamalkavin96.opendrive_backend.exception.ResourceNotFoundException;
import com.kamalkavin96.opendrive_backend.exception.StorageException;
import com.kamalkavin96.opendrive_backend.repository.FileRepository;
import com.kamalkavin96.opendrive_backend.repository.FolderRepository;
import com.kamalkavin96.opendrive_backend.storage.StorageProvider;
import com.kamalkavin96.opendrive_backend.util.NameValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final StorageProvider storageProvider;
    private final StorageProperties storageProperties;

    public FileService(FileRepository fileRepository,
                       FolderRepository folderRepository,
                       StorageProvider storageProvider,
                       StorageProperties storageProperties) {
        this.fileRepository = fileRepository;
        this.folderRepository = folderRepository;
        this.storageProvider = storageProvider;
        this.storageProperties = storageProperties;
    }

    /**
     * Not @Transactional on purpose: a multi-gigabyte upload must not hold a DB connection.
     * If persisting metadata fails after the bytes are stored, the stored object is removed.
     */
    public FileResponse upload(MultipartFile file, UUID folderId) {
        if (file == null) {
            throw new BadRequestException("No file was uploaded");
        }
        long maxSize = storageProperties.getUpload().getMaxFileSize();
        if (maxSize > 0 && file.getSize() > maxSize) {
            throw new BadRequestException("File exceeds the maximum upload size of " + maxSize + " bytes");
        }
        String fileName = NameValidator.fromUpload(file.getOriginalFilename());
        Folder folder = folderId == null ? null : findActiveFolder(folderId);

        String objectKey = newObjectKey();
        MessageDigest digest = newDigest();

        try (InputStream in = new DigestInputStream(file.getInputStream(), digest)) {
            storageProvider.store(objectKey, in);
        } catch (IOException e) {
            throw new StorageException("Failed to store uploaded file", e);
        }

        FileMetadata metadata = new FileMetadata();
        metadata.setFileName(fileName);
        metadata.setObjectKey(objectKey);
        metadata.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        metadata.setFileSize(file.getSize());
        metadata.setFolder(folder);
        metadata.setChecksum(HexFormat.of().formatHex(digest.digest()));

        try {
            return FileResponse.from(fileRepository.save(metadata));
        } catch (RuntimeException e) {
            removeQuietly(objectKey);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<FileResponse> getAllFiles() {
        return fileRepository.findByDeletedFalse().stream().map(FileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FileResponse getFile(UUID id) {
        return FileResponse.from(findActive(id));
    }

    public FileDownload download(UUID id) {
        FileMetadata metadata = findActive(id);
        if (!storageProvider.exists(metadata.getObjectKey())) {
            throw new ResourceNotFoundException("File content is missing from storage");
        }
        try {
            return new FileDownload(metadata, storageProvider.retrieve(metadata.getObjectKey()));
        } catch (IOException e) {
            throw new StorageException("Failed to read file from storage", e);
        }
    }

    @Transactional
    public FileResponse rename(UUID id, String newName) {
        String name = NameValidator.validate(newName, "File name");
        FileMetadata file = findActive(id);
        file.setFileName(name);
        return FileResponse.from(fileRepository.save(file));
    }

    /** targetFolderId == null moves the file to the root. */
    @Transactional
    public FileResponse move(UUID id, UUID targetFolderId) {
        FileMetadata file = findActive(id);
        Folder target = targetFolderId == null ? null : findActiveFolder(targetFolderId);
        file.setFolder(target);
        return FileResponse.from(fileRepository.save(file));
    }

    /**
     * Copies bytes and metadata. targetFolderId == null keeps the file in its current folder
     * (and prefixes the name so the copy is distinguishable).
     */
    @Transactional
    public FileResponse copy(UUID id, UUID targetFolderId) {
        FileMetadata source = findActive(id);
        Folder target = targetFolderId == null ? source.getFolder() : findActiveFolder(targetFolderId);
        boolean sameFolder = Objects.equals(
                target == null ? null : target.getId(),
                source.getFolder() == null ? null : source.getFolder().getId());

        String newKey = newObjectKey();
        try {
            storageProvider.copy(source.getObjectKey(), newKey);
        } catch (IOException e) {
            throw new StorageException("Failed to copy file in storage", e);
        }

        FileMetadata copy = new FileMetadata();
        copy.setFileName(sameFolder ? truncate("Copy of " + source.getFileName()) : source.getFileName());
        copy.setObjectKey(newKey);
        copy.setContentType(source.getContentType());
        copy.setFileSize(source.getFileSize());
        copy.setChecksum(source.getChecksum());
        copy.setFolder(target);

        try {
            return FileResponse.from(fileRepository.saveAndFlush(copy));
        } catch (RuntimeException e) {
            removeQuietly(newKey);
            throw e;
        }
    }

    /** Soft delete: the physical object is kept for a future Recycle Bin. */
    @Transactional
    public void delete(UUID id) {
        FileMetadata file = findActive(id);
        file.setDeleted(true);
        fileRepository.save(file);
    }

    @Transactional(readOnly = true)
    public List<FileResponse> search(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Search term must not be blank");
        }
        return fileRepository.findByFileNameContainingIgnoreCaseAndDeletedFalse(name.strip()).stream()
                .map(FileResponse::from)
                .toList();
    }

    private FileMetadata findActive(UUID id) {
        return fileRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found: " + id));
    }

    private Folder findActiveFolder(UUID id) {
        return folderRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found: " + id));
    }

    /** objects/ab/ab123456-....blob */
    private static String newObjectKey() {
        String uuid = UUID.randomUUID().toString();
        return "objects/" + uuid.substring(0, 2) + "/" + uuid + ".blob";
    }

    private static String truncate(String name) {
        return name.length() > 255 ? name.substring(0, 255) : name;
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private void removeQuietly(String objectKey) {
        try {
            storageProvider.delete(objectKey);
        } catch (IOException e) {
            // Orphaned object; a future reconciliation job should clean these up.
            log.warn("Could not remove orphaned storage object {}", objectKey, e);
        }
    }

    /** Metadata plus an open stream; the caller must close the stream. */
    public record FileDownload(FileMetadata metadata, InputStream stream) {
    }

    /**
     * Replaces the content of an existing file, e.g. after it was edited in the spreadsheet preview.
     * <p>
     * Not @Transactional on purpose, for the same reason as {@link #upload}. The new bytes are
     * written under a fresh object key and the old object is removed only after the metadata points
     * at the new one, so a failed save can never corrupt the original.
     * <p>
     * {@code expectedChecksum} is optional optimistic concurrency: the checksum of the version the
     * user opened. If the file has changed since, the save is rejected with 409.
     */
    public FileResponse overwriteContent(UUID id, MultipartFile upload, String expectedChecksum) {
        if (upload == null || upload.isEmpty()) {
            throw new BadRequestException("No file content was uploaded");
        }
        long maxSize = storageProperties.getUpload().getMaxFileSize();
        if (maxSize > 0 && upload.getSize() > maxSize) {
            throw new BadRequestException("File exceeds the maximum upload size of " + maxSize + " bytes");
        }

        FileMetadata file = findActive(id);

        if (expectedChecksum != null && !expectedChecksum.isBlank()
                && !expectedChecksum.equalsIgnoreCase(file.getChecksum())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "File was modified by someone else. Reload before saving.");
        }

        // Only .xlsx can be rewritten: the editor exports plain .xlsx, which would
        // corrupt .xlsm (macro) files saved under their original name.
        if (!file.getFileName().toLowerCase().endsWith(".xlsx")) {
            throw new BadRequestException("Only .xlsx files can be edited");
        }

        String oldKey = file.getObjectKey();
        String newKey = newObjectKey();
        MessageDigest digest = newDigest();

        try (InputStream raw = new BufferedInputStream(upload.getInputStream())) {
            // .xlsx is a zip archive: reject anything that doesn't start with "PK"
            raw.mark(4);
            byte[] head = raw.readNBytes(4);
            raw.reset();
            if (head.length < 4 || head[0] != 'P' || head[1] != 'K') {
                throw new BadRequestException("Uploaded content is not a valid .xlsx file");
            }
            try (InputStream in = new DigestInputStream(raw, digest)) {
                storageProvider.store(newKey, in);
            }
        } catch (IOException e) {
            removeQuietly(newKey);
            throw new StorageException("Failed to store updated file", e);
        }

        file.setObjectKey(newKey);
        file.setFileSize(upload.getSize());
        file.setChecksum(HexFormat.of().formatHex(digest.digest()));

        FileResponse response;
        try {
            response = FileResponse.from(fileRepository.save(file));
        } catch (RuntimeException e) {
            removeQuietly(newKey);
            throw e;
        }

        // Metadata now points at the new object; the previous bytes are no longer referenced.
        removeQuietly(oldKey);
        return response;
    }
}