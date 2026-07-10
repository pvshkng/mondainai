import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router'
import { HomeRoute } from './routes'

const queryClient = new QueryClient()

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
