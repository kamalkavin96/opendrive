package com.kamalkavin96.opendrive_backend.service;

import com.kamalkavin96.opendrive_backend.dto.request.CreateFolderRequest;
import com.kamalkavin96.opendrive_backend.dto.response.FileResponse;
import com.kamalkavin96.opendrive_backend.dto.response.FolderContentsResponse;
import com.kamalkavin96.opendrive_backend.dto.response.FolderResponse;
import com.kamalkavin96.opendrive_backend.entity.FileMetadata;
import com.kamalkavin96.opendrive_backend.entity.Folder;
import com.kamalkavin96.opendrive_backend.exception.BadRequestException;
import com.kamalkavin96.opendrive_backend.exception.ConflictException;
import com.kamalkavin96.opendrive_backend.exception.ResourceNotFoundException;
import com.kamalkavin96.opendrive_backend.repository.FileRepository;
import com.kamalkavin96.opendrive_backend.repository.FolderRepository;
import com.kamalkavin96.opendrive_backend.util.NameValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class FolderService {

    private static final Comparator<Folder> BY_NAME =
            Comparator.comparing(Folder::getName, String.CASE_INSENSITIVE_ORDER);

    private static final Comparator<FileMetadata> FILES_BY_NAME =
            Comparator.comparing(FileMetadata::getFileName, String.CASE_INSENSITIVE_ORDER);

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;

    public FolderService(FolderRepository folderRepository, FileRepository fileRepository) {
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
    }

    @Transactional
    public FolderResponse create(CreateFolderRequest request) {
        String name = NameValidator.validate(request.name(), "Folder name");
        Folder parent = request.parentId() == null ? null : findActive(request.parentId());
        assertNameAvailable(name, parent == null ? null : parent.getId());

        Folder folder = new Folder();
        folder.setName(name);
        folder.setParent(parent);
        return FolderResponse.from(folderRepository.save(folder));
    }

    public List<FolderResponse> getRootFolders() {
        return folderRepository.findByParentIsNullAndDeletedFalse().stream()
                .sorted(BY_NAME)
                .map(FolderResponse::from)
                .toList();
    }

    public FolderResponse getById(UUID id) {
        return FolderResponse.from(findActive(id));
    }

    /** folderId == null lists the root. */
    public FolderContentsResponse getContents(UUID folderId) {
        Folder folder = folderId == null ? null : findActive(folderId);

        List<Folder> subFolders = folderId == null
                ? folderRepository.findByParentIsNullAndDeletedFalse()
                : folderRepository.findByParent_IdAndDeletedFalse(folderId);
        List<FileMetadata> files = folderId == null
                ? fileRepository.findByFolderIsNullAndDeletedFalse()
                : fileRepository.findByFolder_IdAndDeletedFalse(folderId);

        List<FolderResponse> breadcrumbs = new ArrayList<>();
        for (Folder current = folder; current != null; current = current.getParent()) {
            breadcrumbs.add(FolderResponse.from(current));
        }
        Collections.reverse(breadcrumbs);

        return new FolderContentsResponse(
                folder == null ? null : FolderResponse.from(folder),
                breadcrumbs,
                subFolders.stream().sorted(BY_NAME).map(FolderResponse::from).toList(),
                files.stream().sorted(FILES_BY_NAME).map(FileResponse::from).toList()
        );
    }

    @Transactional
    public FolderResponse rename(UUID id, String newName) {
        String name = NameValidator.validate(newName, "Folder name");
        Folder folder = findActive(id);

        if (!folder.getName().equals(name)) {
            assertNameAvailable(name, parentId(folder));
            folder.setName(name);
        }
        return FolderResponse.from(folderRepository.save(folder));
    }

    /** targetParentId == null moves the folder to the root. */
    @Transactional
    public FolderResponse move(UUID id, UUID targetParentId) {
        Folder folder = findActive(id);
        Folder target = targetParentId == null ? null : findActive(targetParentId);

        // A folder cannot be moved into itself or into one of its own descendants.
        for (Folder current = target; current != null; current = current.getParent()) {
            if (current.getId().equals(folder.getId())) {
                throw new BadRequestException("A folder cannot be moved into itself or its subfolders");
            }
        }

        UUID currentParentId = parentId(folder);
        UUID newParentId = target == null ? null : target.getId();
        if (java.util.Objects.equals(currentParentId, newParentId)) {
            return FolderResponse.from(folder);
        }

        assertNameAvailable(folder.getName(), newParentId);
        folder.setParent(target);
        return FolderResponse.from(folderRepository.save(folder));
    }

    /**
     * Soft-deletes the folder and everything beneath it. Parent links are kept as-is so the
     * original hierarchy can be restored by a future Recycle Bin.
     */
    @Transactional
    public void delete(UUID id) {
        Folder root = findActive(id);

        Deque<Folder> pending = new ArrayDeque<>();
        pending.push(root);

        while (!pending.isEmpty()) {
            Folder current = pending.pop();
            current.setDeleted(true);
            folderRepository.save(current);

            List<FileMetadata> files = fileRepository.findByFolder_IdAndDeletedFalse(current.getId());
            files.forEach(file -> file.setDeleted(true));
            fileRepository.saveAll(files);

            folderRepository.findByParent_IdAndDeletedFalse(current.getId()).forEach(pending::push);
        }
    }

    private Folder findActive(UUID id) {
        return folderRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found: " + id));
    }

    private static UUID parentId(Folder folder) {
        return folder.getParent() == null ? null : folder.getParent().getId();
    }

    private void assertNameAvailable(String name, UUID parentId) {
        boolean exists = parentId == null
                ? folderRepository.existsByNameAndParentIsNullAndDeletedFalse(name)
                : folderRepository.existsByNameAndParent_IdAndDeletedFalse(name, parentId);
        if (exists) {
            throw new ConflictException("A folder named '" + name + "' already exists here");
        }
    }
}
