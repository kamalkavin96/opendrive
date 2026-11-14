package com.kamalkavin96.opendrive_backend.controller;

import com.kamalkavin96.opendrive_backend.dto.request.MoveRequest;
import com.kamalkavin96.opendrive_backend.dto.request.RenameRequest;
import com.kamalkavin96.opendrive_backend.dto.response.FileResponse;
import com.kamalkavin96.opendrive_backend.dto.response.FolderUploadResponse;
import com.kamalkavin96.opendrive_backend.service.FileService;
import com.kamalkavin96.opendrive_backend.service.FolderUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final FolderUploadService folderUploadService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) UUID folderId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.upload(file, folderId));
    }

    @GetMapping
    public List<FileResponse> list() {
        return fileService.getAllFiles();
    }

    @GetMapping("/search")
    public List<FileResponse> search(@RequestParam("name") String name) {
        return fileService.search(name);
    }

    @GetMapping("/{id}")
    public FileResponse get(@PathVariable UUID id) {
        return fileService.getFile(id);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) {
        FileService.FileDownload download = fileService.download(id);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(download.metadata().getContentType());
        } catch (RuntimeException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(download.metadata().getFileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(download.metadata().getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(download.stream()));
    }

    @PutMapping("/{id}/rename")
    public FileResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameRequest request) {
        return fileService.rename(id, request.name());
    }

    @PutMapping("/{id}/move")
    public FileResponse move(@PathVariable UUID id, @RequestBody MoveRequest request) {
        return fileService.move(id, request.targetFolderId());
    }

    @PostMapping("/{id}/copy")
    public ResponseEntity<FileResponse> copy(@PathVariable UUID id,
                                             @RequestBody(required = false) MoveRequest request) {
        UUID target = request == null ? null : request.targetFolderId();
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.copy(id, target));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        fileService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(
            value = "/upload-folder",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<FolderUploadResponse> uploadFolder(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("paths") List<String> paths,
            @RequestParam(value = "targetFolderId", required = false)
            UUID targetFolderId
    ) throws IOException {

        FolderUploadResponse response = folderUploadService.uploadFolder(
                files,
                paths,
                targetFolderId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
