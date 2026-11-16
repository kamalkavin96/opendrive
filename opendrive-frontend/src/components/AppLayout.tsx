import { Outlet } from 'react-router-dom';
import {
  Box,
  Toolbar,
} from '@mui/material';
import NotificationBar from './NotificationBar';
import UploadPanel from './UploadPanel';
import SideDrawer from './SideDrawer';
import TitleBar from './TitleBar';

export default function AppLayout() {

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TitleBar></TitleBar>

      <SideDrawer></SideDrawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0, px: 2, py: 1 }}>
        <Toolbar />
        <Outlet />
      </Box>

      <UploadPanel />
      <NotificationBar />
    </Box>
  );
}
