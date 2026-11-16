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
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
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

    @GetMapping("/{id}/stream")
    public ResponseEntity<StreamingResponseBody> stream(
            @PathVariable UUID id,
            @RequestHeader HttpHeaders headers
    ) throws IOException {

        FileService.FileDownload download = fileService.download(id);

        long fileSize = download.metadata().getFileSize();

        MediaType mediaType;

        try {
            mediaType = MediaType.parseMediaType(
                    download.metadata().getContentType()
            );
        } catch (RuntimeException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(
                        download.metadata().getFileName(),
                        StandardCharsets.UTF_8
                )
                .build();

        List<HttpRange> ranges;

        try {
            ranges = headers.getRange();
        } catch (IllegalArgumentException e) {
            download.stream().close();

            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                    .build();
        }

        // No Range header: stream the complete file.
        if (ranges.isEmpty()) {

            StreamingResponseBody body = outputStream -> {
                try (InputStream input = download.stream()) {
                    input.transferTo(outputStream);
                }
            };

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .contentLength(fileSize)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .header("X-Content-Type-Options", "nosniff")
                    .body(body);
        }

        // Browser video playback normally uses a single byte range.
        if (ranges.size() != 1 || fileSize == 0) {
            download.stream().close();

            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                    .build();
        }

        HttpRange range = ranges.get(0);

        long start;
        long end;

        try {
            start = range.getRangeStart(fileSize);
            end = range.getRangeEnd(fileSize);
        } catch (IllegalArgumentException e) {
            download.stream().close();

            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                    .build();
        }

        if (start >= fileSize || end < start) {
            download.stream().close();

            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                    .build();
        }

        long contentLength = end - start + 1;

        StreamingResponseBody body = outputStream -> {

            try (InputStream input = download.stream()) {

                // Skip bytes before the requested range.
                input.skipNBytes(start);

                byte[] buffer = new byte[64 * 1024];

                long remaining = contentLength;

                while (remaining > 0) {

                    int bytesToRead = (int) Math.min(
                            buffer.length,
                            remaining
                    );

                    int bytesRead = input.read(buffer, 0, bytesToRead);

                    if (bytesRead == -1) {
                        throw new IOException(
                                "Unexpected end of file while streaming"
                        );
                    }

                    outputStream.write(buffer, 0, bytesRead);

                    remaining -= bytesRead;
                }

                outputStream.flush();
            }
        };

        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(mediaType)
                .contentLength(contentLength)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(
                        HttpHeaders.CONTENT_RANGE,
                        "bytes " + start + "-" + end + "/" + fileSize
                )
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(body);
    }

    @PutMapping(value = "/{id}/content", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileResponse saveContent(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "expectedChecksum", required = false) String expectedChecksum) {
        return fileService.overwriteContent(id, file, expectedChecksum);
    }
}
