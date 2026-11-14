import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { MdClose, MdSearch, MdOutlineCloud } from 'react-icons/md';

function Brand() {
  return (
    <Box
      component={RouterLink}
      to="/"
      aria-label="OpenDrive home"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: 200, // lines the search box up with the content area beside the drawer
        color: 'primary.main',
        textDecoration: 'none',
      }}
    >
      <MdOutlineCloud size={28} />
      <Typography variant="h6" fontWeight={700} noWrap>
        OpenDrive
      </Typography>
    </Box>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [term, setTerm] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the input in sync with the URL (back/forward, logo click, etc.)
  useEffect(() => {
    setTerm(query);
  }, [query]);

  const updateTerm = (value: string) => {
    setTerm(value);
    // Text removed while viewing search results -> return to the normal view
    if (value.trim() === '' && query) {
      void navigate('/');
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = term.trim();
    void navigate(trimmed ? `/search?${new URLSearchParams({ q: trimmed })}` : '/');
  };

  return (
    <Box component="form" role="search" onSubmit={handleSubmit} sx={{ flex: 1, maxWidth: 560 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search files"
        value={term}
        onChange={(e) => updateTerm(e.target.value)}
        inputRef={inputRef}
        slotProps={{
          htmlInput: { 'aria-label': 'Search files', enterKeyHint: 'search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch size={20} />
              </InputAdornment>
            ),
            endAdornment: term && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="Clear search"
                  onClick={() => {
                    updateTerm('');
                    inputRef.current?.focus();
                  }}
                >
                  <MdClose size={18} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#f3f2f1',
            borderRadius: 1,
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: 'transparent' },
            '&.Mui-focused': { bgcolor: 'background.paper' },
          },
        }}
      />
    </Box>
  );
}

const TitleBar = () => (
  <AppBar
    position="fixed"
    color="inherit"
    elevation={0}
    sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider' }}
  >
    <Toolbar sx={{ gap: 3 }}>
      <Brand />
      <SearchBox />
    </Toolbar>
  </AppBar>
);

export default TitleBar;