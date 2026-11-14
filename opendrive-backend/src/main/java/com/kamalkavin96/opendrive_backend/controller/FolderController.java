package com.kamalkavin96.opendrive_backend.controller;

import com.kamalkavin96.opendrive_backend.dto.request.CreateFolderRequest;
import com.kamalkavin96.opendrive_backend.dto.request.MoveRequest;
import com.kamalkavin96.opendrive_backend.dto.request.RenameRequest;
import com.kamalkavin96.opendrive_backend.dto.response.FolderContentsResponse;
import com.kamalkavin96.opendrive_backend.dto.response.FolderResponse;
import com.kamalkavin96.opendrive_backend.service.FolderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @PostMapping
    public ResponseEntity<FolderResponse> create(@Valid @RequestBody CreateFolderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(folderService.create(request));
    }

    @GetMapping("/root")
    public List<FolderResponse> rootFolders() {
        return folderService.getRootFolders();
    }

    /** Root listing including files; used by the UI's home view. */
    @GetMapping("/root/contents")
    public FolderContentsResponse rootContents() {
        return folderService.getContents(null);
    }

    @GetMapping("/{id}")
    public FolderResponse get(@PathVariable UUID id) {
        return folderService.getById(id);
    }

    @GetMapping("/{id}/contents")
    public FolderContentsResponse contents(@PathVariable UUID id) {
        return folderService.getContents(id);
    }

    @PutMapping("/{id}/rename")
    public FolderResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameRequest request) {
        return folderService.rename(id, request.name());
    }

    @PutMapping("/{id}/move")
    public FolderResponse move(@PathVariable UUID id, @RequestBody MoveRequest request) {
        return folderService.move(id, request.targetFolderId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        folderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
