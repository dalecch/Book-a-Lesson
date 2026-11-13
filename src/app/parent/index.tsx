import { FamilyHome } from "../../features/homes";
import { Screen } from "../../features/shell";

export default function ParentHomeScreen() {
  return (
    <Screen>
      <FamilyHome mode="parent" />
    </Screen>
  );
}
