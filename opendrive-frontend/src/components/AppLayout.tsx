import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { MdCloud, MdDeleteOutline, MdFolderOpen, MdSearch } from 'react-icons/md';
import NotificationBar from './NotificationBar';
import UploadPanel from './UploadPanel';

const DRAWER_WIDTH = 230;

export default function AppLayout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 3 }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', textDecoration: 'none' }}
          >
            <MdCloud size={28} />
            <Typography variant="h6" fontWeight={700}>
              OpenDrive
            </Typography>
          </Box>
          <Box component="form" onSubmit={onSearch} sx={{ flex: 1, maxWidth: 560 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search files"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch size={20} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1 }}>
          <ListItemButton component={RouterLink} to="/">
            <ListItemIcon sx={{ minWidth: 36 }}>
              <MdFolderOpen size={22} />
            </ListItemIcon>
            <ListItemText primary="My files" />
          </ListItemButton>
          <ListItemButton disabled>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <MdDeleteOutline size={22} />
            </ListItemIcon>
            <ListItemText primary="Recycle bin" secondary="Coming soon" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>

      <UploadPanel />
      <NotificationBar />
    </Box>
  );
}
