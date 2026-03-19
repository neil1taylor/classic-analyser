// App.tsx is no longer the entry point — see main.tsx + router.tsx
// This file is kept for backward compatibility with test imports
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';

const App = () => <RouterProvider router={router} />;

export default App;
