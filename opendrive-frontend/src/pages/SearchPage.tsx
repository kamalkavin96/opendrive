import { useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import ItemTable from '../components/ItemTable';
import { errorMessage } from '../api/client';
import { useSearch } from '../hooks/useDrive';

export default function SearchPage() {
  const [params] = useSearchParams();
  const term = params.get('q') ?? '';
  const { data, isLoading, error } = useSearch(term);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {term ? `Results for "${term}"` : 'Search'}
      </Typography>
      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{errorMessage(error)}</Alert>}
      {data && <ItemTable folders={[]} files={data} emptyText="No files match your search." />}
    </Box>
  );
}
