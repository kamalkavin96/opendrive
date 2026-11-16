package com.kamalkavin96.opendrive_backend.dto.response;

import java.util.List;

public record FolderUploadResponse(
        int totalFiles,
        int uploadedFiles,
        int createdFolders,
        List<FileResponse> files
) {
}