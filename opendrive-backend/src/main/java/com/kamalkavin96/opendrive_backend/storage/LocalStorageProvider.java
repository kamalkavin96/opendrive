package com.kamalkavin96.opendrive_backend.storage;

import com.kamalkavin96.opendrive_backend.config.StorageProperties;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Filesystem-backed StorageProvider.
 * <p>
 * Safety measures: object keys are resolved inside a fixed root, the resolved real path
 * (after following symlinks) must stay inside that root, existing objects are never
 * overwritten, and writes go to a temp file first and are moved into place.
 */
public class LocalStorageProvider implements StorageProvider {

    private final Path root;

    public LocalStorageProvider(StorageProperties properties) {
        String configured = properties.getLocal().getPath();
        if (configured == null || configured.isBlank()) {
            throw new IllegalStateException("opendrive.storage.local.path must be configured");
        }
        try {
            Path path = Paths.get(configured).toAbsolutePath().normalize();
            Files.createDirectories(path);
            this.root = path.toRealPath();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot initialise storage directory: " + configured, e);
        }
    }

    @Override
    public void store(String objectKey, InputStream inputStream) throws IOException {
        Path target = resolve(objectKey);
        Path parent = target.getParent();
        Files.createDirectories(parent);
        ensureInsideRoot(parent);

        if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
            throw new FileAlreadyExistsException(objectKey);
        }

        Path temp = Files.createTempFile(parent, ".upload-", ".tmp");
        try {
            Files.copy(inputStream, temp, StandardCopyOption.REPLACE_EXISTING);
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException | RuntimeException e) {
            Files.deleteIfExists(temp);
            throw e;
        }
    }

    @Override
    public InputStream retrieve(String objectKey) throws IOException {
        Path path = resolve(objectKey);
        if (!Files.isRegularFile(path)) {
            throw new NoSuchFileException(objectKey);
        }
        ensureInsideRoot(path);
        return Files.newInputStream(path);
    }

    @Override
    public void delete(String objectKey) throws IOException {
        Path path = resolve(objectKey);
        if (Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            ensureInsideRoot(path.getParent());
            Files.delete(path);
        }
    }

    @Override
    public void copy(String sourceKey, String destinationKey) throws IOException {
        try (InputStream in = retrieve(sourceKey)) {
            store(destinationKey, in);
        }
    }

    @Override
    public boolean exists(String objectKey) {
        return Files.isRegularFile(resolve(objectKey));
    }

    @Override
    public long getSize(String objectKey) throws IOException {
        Path path = resolve(objectKey);
        ensureInsideRoot(path);
        return Files.size(path);
    }

    private Path resolve(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("Object key must not be blank");
        }
        Path resolved = root.resolve(objectKey).normalize();
        if (!resolved.startsWith(root) || resolved.equals(root)) {
            throw new IllegalArgumentException("Invalid object key");
        }
        return resolved;
    }

    private void ensureInsideRoot(Path existingPath) throws IOException {
        if (!existingPath.toRealPath().startsWith(root)) {
            throw new IOException("Path escapes the storage root");
        }
    }
}
