import { Route, Routes } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import AppLayout from './components/AppLayout';
import ExplorerPage from './pages/ExplorerPage';
import SearchPage from './pages/SearchPage';

function NotFound() {
  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h5" gutterBottom>
        Page not found
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Back to My files
      </Button>
    </Box>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ExplorerPage />} />
        <Route path="folder/:folderId" element={<ExplorerPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
