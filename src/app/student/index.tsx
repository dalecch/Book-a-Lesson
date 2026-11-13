import { FamilyHome } from "../../features/homes";
import { Screen } from "../../features/shell";

export default function StudentHomeScreen() {
  return (
    <Screen>
      <FamilyHome mode="student" />
    </Screen>
  );
}
