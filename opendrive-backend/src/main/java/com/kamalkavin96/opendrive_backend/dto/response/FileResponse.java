package com.kamalkavin96.opendrive_backend.dto.response;

import com.kamalkavin96.opendrive_backend.entity.FileMetadata;

import java.time.Instant;
import java.util.UUID;

/** Intentionally omits objectKey so internal storage layout is never exposed. */
public record FileResponse(
        UUID id,
        String fileName,
        String contentType,
        long fileSize,
        UUID folderId,
        String checksum,
        Instant createdAt,
        Instant updatedAt
) {
    public static FileResponse from(FileMetadata file) {
        return new FileResponse(
                file.getId(),
                file.getFileName(),
                file.getContentType(),
                file.getFileSize(),
                file.getFolder() == null ? null : file.getFolder().getId(),
                file.getChecksum(),
                file.getCreatedAt(),
                file.getUpdatedAt()
        );
    }
}
