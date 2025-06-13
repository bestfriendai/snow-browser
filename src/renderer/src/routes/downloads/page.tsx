import { DownloadsManager } from "@/components/downloads/downloads-manager";

function Page() {
  return <DownloadsManager />;
}

function App() {
  return (
    <>
      <title>Downloads | Snow Browser</title>
      <link rel="icon" type="image/png" href="/assets/icon.png" />
      <Page />
    </>
  );
}

export default App;
