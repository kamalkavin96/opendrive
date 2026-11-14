package com.kamalkavin96.opendrive_backend.dto.response;

import com.kamalkavin96.opendrive_backend.entity.Folder;

import java.time.Instant;
import java.util.UUID;

public record FolderResponse(
        UUID id,
        String name,
        UUID parentId,
        Instant createdAt,
        Instant updatedAt
) {
    public static FolderResponse from(Folder folder) {
        return new FolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getParent() == null ? null : folder.getParent().getId(),
                folder.getCreatedAt(),
                folder.getUpdatedAt()
        );
    }
}
