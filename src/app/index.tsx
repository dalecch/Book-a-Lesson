import { Redirect } from "expo-router";

import { useStore } from "../data/store";
import { LoginPanel } from "../features/login-panel";
import { homeHref, Screen } from "../features/shell";

export default function Index() {
  const { user } = useStore();
  if (user) return <Redirect href={homeHref(user.role)} />;
  return (
    <Screen showDemo={false}>
      <LoginPanel />
    </Screen>
  );
}
