import type { FileResponse } from '../api/types';

import {
    previewRegistry,
    unsupportedPreview,
} from '../components/filepreview/previewRegistry';

export function getPreviewDefinition(file: FileResponse) {
    const fileName = (file.fileName ?? '').trim().toLowerCase();

    const extension = fileName.includes('.')
        ? fileName.substring(fileName.lastIndexOf('.') + 1)
        : '';

    const contentType = (file.contentType ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();

    console.log('Preview detection:', {
        fileName,
        extension,
        contentType,
    });

    // Match by extension
    const extensionMatch = previewRegistry.find((definition) =>
        definition.extensions.includes(extension)
    );

    if (extensionMatch) {
        console.log('Matched extension:', extensionMatch.category);
        return extensionMatch;
    }

    // Match by MIME type
    const mimeMatch = previewRegistry.find((definition) =>
        definition.mimeTypes.some((mime) =>
            mime.endsWith('/')
                ? contentType.startsWith(mime)
                : contentType === mime
        )
    );

    if (mimeMatch) {
        console.log('Matched MIME:', mimeMatch.category);
        return mimeMatch;
    }

    // Excel fallback
    const excelMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroenabled.12',
        'application/vnd.oasis.opendocument.spreadsheet',
        'text/csv',
        'application/csv',
    ];

    if (
        ['xlsx', 'xls', 'csv', 'xlsm', 'ods'].includes(extension) ||
        excelMimeTypes.includes(contentType)
    ) {
        const excelDefinition = previewRegistry.find(
            (definition) => definition.category === 'spreadsheet'
        );

        if (excelDefinition) {
            return excelDefinition;
        }
    }

    console.log('No preview renderer matched.');

    return unsupportedPreview;
}