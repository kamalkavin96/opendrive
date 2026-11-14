package com.kamalkavin96.opendrive_backend.repository;

import com.kamalkavin96.opendrive_backend.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FolderRepository
        extends JpaRepository<Folder, UUID> {

    List<Folder> findByParent_IdAndDeletedFalse(UUID parentId);

    List<Folder> findByParentIsNullAndDeletedFalse();

    Optional<Folder> findByIdAndDeletedFalse(UUID id);

    boolean existsByNameAndParent_IdAndDeletedFalse(
            String name,
            UUID parentId
    );

    boolean existsByNameAndParentIsNullAndDeletedFalse(String name);
}
