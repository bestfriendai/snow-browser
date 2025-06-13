import { WelcomePage } from "@/components/welcome/main";

function Page() {
  return <WelcomePage />;
}

function App() {
  return (
    <>
      <title>Welcome | Snow Browser</title>
      <link rel="icon" type="image/png" href="/assets/icon.png" />
      <Page />
    </>
  );
}

export default App;
