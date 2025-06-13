import { SettingsLayout } from "@/components/settings/settings-layout";

function Page() {
  return <SettingsLayout />;
}

function App() {
  return (
    <>
      <title>Settings | Snow Browser</title>
      <link rel="icon" type="image/png" href="/assets/icon.png" />
      <Page />
    </>
  );
}

export default App;
