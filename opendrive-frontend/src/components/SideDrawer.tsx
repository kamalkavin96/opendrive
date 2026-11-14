import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import type { IconType } from 'react-icons';
import {
  MdDelete,
  MdDeleteOutline,
  MdFolder,
  MdFolderOpen,
  MdPeople,
  MdPeopleOutline,
} from 'react-icons/md';
import { formatBytes } from '../utils/format';

const DRAWER_WIDTH = 240;

// OneDrive-like neutral surfaces
const NAV_BG = '#ffffff';
const HOVER_BG = '#f0efee';
const SELECTED_BG = '#edebe9';

interface NavItem {
  label: string;
  to: string;
  icon: IconType;
  activeIcon: IconType;
  isActive: (pathname: string) => boolean;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'My files',
    to: '/',
    icon: MdFolderOpen,
    activeIcon: MdFolder,
    isActive: (p) => p === '/' || p.startsWith('/folder') || p.startsWith('/search'),
  },
  {
    label: 'Shared',
    to: '/shared',
    icon: MdPeopleOutline,
    activeIcon: MdPeople,
    isActive: (p) => p.startsWith('/shared'),
    disabled: true,
  },
  {
    label: 'Recycle bin',
    to: '/recycle-bin',
    icon: MdDeleteOutline,
    activeIcon: MdDelete,
    isActive: (p) => p.startsWith('/recycle-bin'),
    disabled: true,
  },
];

interface Props {
  /** Optional. The storage section only renders when both values are provided. */
  usedBytes?: number;
  totalBytes?: number;
}

const SideDrawer = ({ usedBytes, totalBytes }: Props) => {
  const { pathname } = useLocation();
  const showStorage = usedBytes !== undefined && totalBytes !== undefined && totalBytes > 0;

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: NAV_BG,
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      <Toolbar />

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, pt: 1.5, pb: 2 }}>
        <List component="nav" aria-label="Main navigation" disablePadding sx={{ px: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = !item.disabled && item.isActive(pathname);
            const Icon = active ? item.activeIcon : item.icon;

            return (
              <ListItemButton
                key={item.label}
                component={RouterLink}
                to={item.to}
                selected={active}
                disabled={item.disabled}
                aria-current={active ? 'page' : undefined}
                sx={{
                  position: 'relative',
                  height: 40,
                  mb: 0.25,
                  px: 1.5,
                  borderRadius: 1,
                  color: 'text.primary',
                  '&:hover': { bgcolor: HOVER_BG },
                  '&.Mui-selected': {
                    bgcolor: SELECTED_BG,
                    '&:hover': { bgcolor: SELECTED_BG },
                  },
                  // OneDrive's signature blue accent bar on the active item
                  '&.Mui-selected::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                  },
                  '&.Mui-disabled': { opacity: 0.55 },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}
                >
                  <Icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: { fontSize: 14, fontWeight: active ? 600 : 400, noWrap: true },
                  }}
                />
                {item.disabled && (
                  <Typography variant="caption" color="text.secondary">
                    Soon
                  </Typography>
                )}
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ flex: 1 }} />

        {showStorage && (
          <Box sx={{ px: 2.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Storage
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (usedBytes / totalBytes) * 100)}
              sx={{ height: 4, borderRadius: 2, bgcolor: '#e1dfdd' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {formatBytes(usedBytes)} used of {formatBytes(totalBytes)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default SideDrawer;