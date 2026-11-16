package com.kamalkavin96.opendrive_backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class UploadConfigLogger implements ApplicationRunner {

    private final Environment environment;
    private final StorageProperties storageProperties;

    public UploadConfigLogger(
            Environment environment,
            StorageProperties storageProperties) {
        this.environment = environment;
        this.storageProperties = storageProperties;
    }

    @Override
    public void run(ApplicationArguments args) {

        System.out.println("========== UPLOAD CONFIG ==========");

        System.out.println(
                "Active profiles: " +
                        String.join(",", environment.getActiveProfiles())
        );

        System.out.println(
                "Multipart enabled: " +
                        environment.getProperty(
                                "spring.servlet.multipart.enabled"
                        )
        );

        System.out.println(
                "Multipart max file size: " +
                        environment.getProperty(
                                "spring.servlet.multipart.max-file-size"
                        )
        );

        System.out.println(
                "Multipart max request size: " +
                        environment.getProperty(
                                "spring.servlet.multipart.max-request-size"
                        )
        );

        System.out.println(
                "Custom max file size: " +
                        storageProperties.getUpload().getMaxFileSize()
        );

        System.out.println("===================================");
    }
}