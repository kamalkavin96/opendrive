package com.kamalkavin96.opendrive_backend.repository;

import com.kamalkavin96.opendrive_backend.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileRepository
        extends JpaRepository<FileMetadata, UUID> {

    List<FileMetadata> findByDeletedFalse();

    List<FileMetadata> findByFolder_IdAndDeletedFalse(UUID folderId);

    List<FileMetadata> findByFolderIsNullAndDeletedFalse();

    Optional<FileMetadata> findByIdAndDeletedFalse(UUID id);

    List<FileMetadata>
    findByFileNameContainingIgnoreCaseAndDeletedFalse(String fileName);
}
