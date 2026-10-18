import { Button } from '@/components/Button/Button';
import { Tab, type TabProps } from './Tab/Tab';
import styles from './TabBar.module.css';

const defaultTab: TabProps = {
  name: 'New tab',
  isActive: true
};

export const TabBar = ( { tabs }: {tabs?: TabProps[]}) => {
  const tabsToRender = tabs?.length ? tabs : [defaultTab];

  return (
    <div className={styles.tabBar}>
      {tabsToRender.map((tab, index) => (
        <Tab key={index} name={tab.name} fileType={tab.fileType} isActive={tab.isActive} />
      ))}

      <Button startIcon='add' className={styles.add} />
    </div>
  );
}