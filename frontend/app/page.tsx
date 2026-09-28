import VisualizerWrapper from './components/VisualizerWrapper';

export default async function Home(props: {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Await dynamic router parameters to satisfy Next.js 15/16 asynchronous dynamic APIs
  if (props.params) {
    await props.params;
  }
  if (props.searchParams) {
    await props.searchParams;
  }

  return <VisualizerWrapper />;
}
