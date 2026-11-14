package com.kamalkavin96.opendrive_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** parentId == null creates the folder at the root. */
public record CreateFolderRequest(
        @NotBlank @Size(max = 255) String name,
        UUID parentId,
        String color
) {
}
