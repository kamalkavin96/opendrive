package com.kamalkavin96.opendrive_backend.config;

import com.kamalkavin96.opendrive_backend.storage.LocalStorageProvider;
import com.kamalkavin96.opendrive_backend.storage.StorageProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers exactly one StorageProvider, chosen by opendrive.storage.provider.
 * Add MinIO / S3 beans here later with their own havingValue.
 */
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(prefix = "opendrive.storage", name = "provider",
            havingValue = "local", matchIfMissing = true)
    public StorageProvider localStorageProvider(StorageProperties properties) {
        return new LocalStorageProvider(properties);
    }
}
