import { useState, type MouseEvent } from 'react';

import {
    Button,
    Stack,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';

import {
    MdAdd,
    MdCreateNewFolder,
    MdInsertDriveFile,
    MdFolder,
} from 'react-icons/md';

interface ExplorerActionsProps {
    onNewFolder: () => void;
    onUpload: () => void;
    onUploadFolder: () => void;
}

export default function ExplorerActions({onNewFolder, onUpload, onUploadFolder,}: Readonly<ExplorerActionsProps>) {

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const open = Boolean(anchorEl);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAction = (action: () => void) => {
        handleClose();
        action();
    };

    return (
        <Stack direction="row">

            <Button
                variant="outlined"
                startIcon={<MdAdd />}
                onClick={handleClick}
                aria-controls={open ? 'new-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
            >
                New
            </Button>

            <Menu
                id="new-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 210,
                            mt: 1,
                        },
                    },
                }}
            >
                <MenuItem onClick={() => handleAction(onNewFolder)}>
                    <ListItemIcon>
                        <MdCreateNewFolder size={20} />
                    </ListItemIcon>
                    <ListItemText>New folder</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={() => handleAction(onUpload)}>
                    <ListItemIcon>
                        <MdInsertDriveFile size={20} />
                    </ListItemIcon>
                    <ListItemText>Upload files</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => handleAction(onUploadFolder)}>
                    <ListItemIcon>
                        <MdFolder size={20} />
                    </ListItemIcon>
                    <ListItemText>Upload folder</ListItemText>
                </MenuItem>

            </Menu>
        </Stack>
    );
}