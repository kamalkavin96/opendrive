CREATE TABLE folders (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES folders (id),
    deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_folders_parent ON folders (parent_id);

-- Prevents duplicate active folder names under the same parent (root = nil UUID)
CREATE UNIQUE INDEX uq_folders_parent_name_active
    ON folders (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
    WHERE deleted = FALSE;

CREATE TABLE files (
    id            UUID PRIMARY KEY,
    file_name     VARCHAR(255) NOT NULL,
    object_key    VARCHAR(512) NOT NULL UNIQUE,
    content_type  VARCHAR(255),
    file_size     BIGINT NOT NULL,
    folder_id     UUID REFERENCES folders (id),
    checksum      VARCHAR(64),
    deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_files_folder ON files (folder_id);
