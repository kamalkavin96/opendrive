package com.kamalkavin96.opendrive_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameRequest(
        @NotBlank @Size(max = 255) String name,
        String color

) {
}
