import {
    Button,
    Stack,
} from '@mui/material';

import {
    MdCreateNewFolder,
    MdCloudUpload,
} from 'react-icons/md';

interface ExplorerActionsProps {
    onNewFolder: () => void;
    onUpload: () => void;
}

export default function ExplorerActions({
    onNewFolder,
    onUpload,
}: Readonly<ExplorerActionsProps>) {
    return (
        <Stack direction="row" spacing={1}>
            <Button
                variant="outlined"
                startIcon={<MdCreateNewFolder />}
                onClick={onNewFolder}
            >
                New folder
            </Button>

            <Button
                variant="contained"
                startIcon={<MdCloudUpload />}
                onClick={onUpload}
            >
                Upload
            </Button>
        </Stack>
    );
}