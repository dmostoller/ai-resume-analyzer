// app/page.tsx
import { MainPage } from '../components/MainPage';

interface SearchParams {
  success?: string;
  canceled?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  // Ensure searchParams is resolved
  const params = await Promise.resolve(searchParams);

  return <MainPage searchParams={params} />;
}
