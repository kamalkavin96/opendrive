package com.kamalkavin96.opendrive_backend.dto.response;

import java.util.List;

/**
 * folder is null for the root. breadcrumbs run from the top-level folder down to
 * (and including) the current folder.
 */
public record FolderContentsResponse(
        FolderResponse folder,
        List<FolderResponse> breadcrumbs,
        List<FolderResponse> folders,
        List<FileResponse> files
) {
}
