package com.kamalkavin96.opendrive_backend.storage;

import java.io.IOException;
import java.io.InputStream;

public interface StorageProvider {

    void store(String objectKey, InputStream inputStream)
            throws IOException;

    InputStream retrieve(String objectKey)
            throws IOException;

    void delete(String objectKey)
            throws IOException;

    void copy(String sourceKey, String destinationKey)
            throws IOException;

    boolean exists(String objectKey);

    long getSize(String objectKey)
            throws IOException;
}
