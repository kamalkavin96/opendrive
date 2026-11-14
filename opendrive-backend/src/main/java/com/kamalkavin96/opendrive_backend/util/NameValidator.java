package com.kamalkavin96.opendrive_backend.util;

import com.kamalkavin96.opendrive_backend.exception.BadRequestException;

public final class NameValidator {

    private static final int MAX_LENGTH = 255;

    private NameValidator() {
    }

    /** Validates a user-supplied file or folder name and returns the trimmed value. */
    public static String validate(String raw, String label) {
        if (raw == null) {
            throw new BadRequestException(label + " is required");
        }
        String name = raw.strip();
        if (name.isEmpty()) {
            throw new BadRequestException(label + " must not be blank");
        }
        if (name.length() > MAX_LENGTH) {
            throw new BadRequestException(label + " must be at most " + MAX_LENGTH + " characters");
        }
        if (name.equals(".") || name.equals("..")) {
            throw new BadRequestException(label + " is not allowed");
        }
        if (name.chars().anyMatch(c -> c < 32 || c == 127 || c == '/' || c == '\\')) {
            throw new BadRequestException(label + " contains invalid characters");
        }
        return name;
    }

    /** Browsers may send a path as the multipart filename; keep only the last segment. */
    public static String fromUpload(String originalFilename) {
        if (originalFilename == null) {
            throw new BadRequestException("File name is required");
        }
        String normalized = originalFilename.replace('\\', '/');
        String name = normalized.substring(normalized.lastIndexOf('/') + 1);
        return validate(name, "File name");
    }
}
