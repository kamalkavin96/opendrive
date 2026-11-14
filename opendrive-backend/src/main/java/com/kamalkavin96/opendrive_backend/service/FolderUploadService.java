package com.kamalkavin96.opendrive_backend.service;

import com.kamalkavin96.opendrive_backend.dto.response.FileResponse;
import com.kamalkavin96.opendrive_backend.dto.response.FolderUploadResponse;
import com.kamalkavin96.opendrive_backend.entity.Folder;
import com.kamalkavin96.opendrive_backend.repository.FolderRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderUploadService {

    private static final String DEFAULT_FOLDER_COLOR = "#F9A825";

    private final FolderRepository folderRepository;
    private final FolderService folderService;
    private final FileService fileService;

    public FolderUploadResponse uploadFolder(
            List<MultipartFile> files,
            List<String> paths,
            UUID targetFolderId
    ) throws IOException {

        if (files == null || paths == null || files.size() != paths.size()) {
            throw new IllegalArgumentException(
                    "Files and paths must have matching counts"
            );
        }

        // Resolve target folder
        Folder targetFolder = null;

        if (targetFolderId != null) {
            targetFolder = folderRepository
                    .findByIdAndDeletedFalse(targetFolderId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Target folder not found")
                    );
        }

        // Cache directory paths to avoid repeated folder creation/lookups
        Map<String, Folder> folderCache = new HashMap<>();

        List<FileResponse> uploadedFiles = new ArrayList<>();

        int createdFolders = 0;

        for (int i = 0; i < files.size(); i++) {

            MultipartFile file = files.get(i);
            String relativePath = paths.get(i);

            if (file == null) {
                throw new IllegalArgumentException("File cannot be null");
            }

            List<String> segments = validateAndSplitPath(relativePath);

            if (segments.isEmpty()) {
                throw new IllegalArgumentException("Invalid file path");
            }

            Folder currentParent = targetFolder;

            StringBuilder relativeDirectory = new StringBuilder();

            /*
             * Example:
             * MyProject/backend/src/Main.java
             *
             * Creates:
             * MyProject
             * MyProject/backend
             * MyProject/backend/src
             */

            for (int j = 0; j < segments.size() - 1; j++) {

                String directoryName = segments.get(j);

                if (relativeDirectory.length() > 0) {
                    relativeDirectory.append("/");
                }

                relativeDirectory.append(directoryName);

                String directoryPath = relativeDirectory.toString();

                Folder cachedFolder = folderCache.get(directoryPath);

                if (cachedFolder != null) {
                    currentParent = cachedFolder;
                    continue;
                }

                // Check whether the folder already exists
                Folder childFolder = findChildFolder(
                        currentParent,
                        directoryName
                );

                // Create folder if it doesn't exist
                if (childFolder == null) {
                    childFolder = createFolder(
                            directoryName,
                            currentParent
                    );

                    createdFolders++;
                }

                folderCache.put(directoryPath, childFolder);

                currentParent = childFolder;
            }

            // Upload file into its correct destination folder
            UUID destinationFolderId = currentParent != null
                    ? currentParent.getId()
                    : null;

            FileResponse response = fileService.upload(
                    file,
                    destinationFolderId
            );

            uploadedFiles.add(response);
        }

        return new FolderUploadResponse(
                files.size(),
                uploadedFiles.size(),
                createdFolders,
                uploadedFiles
        );
    }

    /**
     * Find an existing child folder.
     */
    private Folder findChildFolder(
            Folder parent,
            String folderName
    ) {

        List<Folder> children = parent == null
                ? folderRepository.findByParentIsNullAndDeletedFalse()
                : folderRepository.findByParent_IdAndDeletedFalse(
                parent.getId()
        );

        return children.stream()
                .filter(folder -> folder.getName().equals(folderName))
                .findFirst()
                .orElse(null);
    }

    /**
     * Create folder using existing FolderService validation.
     */
    private Folder createFolder(
            String folderName,
            Folder parent
    ) {

        return folderService.createFolderForUpload(
                folderName,
                parent != null ? parent.getId() : null,
                DEFAULT_FOLDER_COLOR
        );
    }

    /**
     * Validate and split browser relative paths.
     */
    private List<String> validateAndSplitPath(String path) {

        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("File path cannot be empty");
        }

        String normalized = path.replace('\\', '/');

        if (normalized.startsWith("/")
                || normalized.matches("^[A-Za-z]:.*")
                || normalized.indexOf('\0') >= 0) {

            throw new IllegalArgumentException("Invalid file path");
        }

        String[] segments = normalized.split("/");

        List<String> result = new ArrayList<>();

        for (String segment : segments) {

            if (segment.isBlank() || segment.equals(".")) {
                continue;
            }

            if (segment.equals("..")) {
                throw new IllegalArgumentException(
                        "Path traversal is not allowed"
                );
            }

            result.add(segment);
        }

        return result;
    }
}