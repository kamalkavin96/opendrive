package com.kamalkavin96.opendrive_backend.dto.request;

import java.util.UUID;

/** targetFolderId == null means the root. */
public record MoveRequest(UUID targetFolderId) {
}
