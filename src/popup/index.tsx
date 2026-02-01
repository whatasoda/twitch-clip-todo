import { Trash2 } from "lucide-solid";
import { createMemo, createSignal, Show, Suspense } from "solid-js";
import { Button } from "@/components/ui/button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Center, Flex } from "../../styled-system/jsx";
import { Header, RecordList } from "./components";
import { CleanupBanner } from "./components/CleanupBanner";
import { FirstRecordHint } from "./components/FirstRecordHint";
import { HelpPanel } from "./components/HelpPanel";
import { TabSwitcher, type TabValue } from "./components/TabSwitcher";
import { WelcomeCard } from "./components/WelcomeCard";
import { useCurrentTab, useRecordActions, useRecords } from "./hooks";
import { useAuth } from "./hooks/use-auth";
import { useCleanupNotification } from "./hooks/use-cleanup-notification";
import { useOnboarding } from "./hooks/use-onboarding";

export default function App() {
  const { records, error } = useRecords();
  const { pageInfo } = useCurrentTab();
  const { isAuthenticated } = useAuth();
  const { shouldShowFirstRecordHint, dismissFirstRecordHint } = useOnboarding();
  const { notification: cleanupNotification, dismissNotification: dismissCleanup } =
    useCleanupNotification();
  const [showHelp, setShowHelp] = createSignal(false);
  const {
    updateMemo,
    deleteRecord,
    openClipCreation,
    discoverVodForStreamer,
    getRecentVods,
    openClipForVod,
    deleteByStreamerId,
    deleteCompleted,
  } = useRecordActions();
  const [activeTab, setActiveTab] = createSignal<TabValue>("pending");

  const pendingCount = createMemo(
    () => records()?.filter((r) => r.completedAt === null).length ?? 0,
  );
  const completedCount = createMemo(
    () => records()?.filter((r) => r.completedAt !== null).length ?? 0,
  );

  return (
    <Box minH="100vh" bg="bg.canvas" color="fg.default" position="relative">
      <Header
        pageInfo={pageInfo()}
        showAuth={isAuthenticated()}
        onHelpClick={() => setShowHelp(true)}
      />

      <Show when={showHelp()}>
        <HelpPanel onClose={() => setShowHelp(false)} />
      </Show>

      <Show when={error()}>
        <Box p="4" bg="red.2" color="red.11">
          {t(MSG.COMMON_ERROR)}: {error()?.message}
        </Box>
      </Show>

      <Show when={cleanupNotification()?.count}>
        {(count) => <CleanupBanner count={count()} onDismiss={dismissCleanup} />}
      </Show>

      <Show when={isAuthenticated()} fallback={<WelcomeCard />}>
        <Suspense
          fallback={
            <Center py="8">
              <Box color="fg.muted">{t(MSG.COMMON_LOADING)}</Box>
            </Center>
          }
        >
          <Show when={records()}>
            {(recordsData) => (
              <>
                <TabSwitcher
                  activeTab={activeTab()}
                  onTabChange={setActiveTab}
                  pendingCount={pendingCount()}
                  completedCount={completedCount()}
                />
                <Show when={shouldShowFirstRecordHint(true, pendingCount() + completedCount())}>
                  <FirstRecordHint onDismiss={dismissFirstRecordHint} />
                </Show>
                <Show when={activeTab() === "completed" && completedCount() > 0}>
                  <Flex px="4" pt="2" justifyContent="flex-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t(MSG.RECORD_DELETE_ALL_COMPLETED_CONFIRM))) {
                          deleteCompleted();
                        }
                      }}
                    >
                      <Trash2 size={14} /> {t(MSG.RECORD_DELETE_ALL_COMPLETED)}
                    </Button>
                  </Flex>
                </Show>
                <RecordList
                  records={recordsData()}
                  filter={activeTab()}
                  onUpdateMemo={updateMemo}
                  onDelete={deleteRecord}
                  onOpenClip={openClipCreation}
                  onFindVod={discoverVodForStreamer}
                  onGetRecentVods={getRecentVods}
                  onSelectVod={openClipForVod}
                  onDeleteAll={deleteByStreamerId}
                />
              </>
            )}
          </Show>
        </Suspense>
      </Show>
    </Box>
  );
}
