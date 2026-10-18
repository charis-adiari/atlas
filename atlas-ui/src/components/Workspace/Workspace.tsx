import { TabBar } from "./TabBar/TabBar";
import styles from "./Workspace.module.css";

export const Workspace = ({ vaultId }: { vaultId?: string }) => {
  return <div className={styles.workspace}>
    <TabBar />
    Work is done in here
    </div>;
};
