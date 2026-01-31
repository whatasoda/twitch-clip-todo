import { Trash2 } from "lucide-solid";
import { createMemo, createSignal, Show, Suspense } from "solid-js";
import { Button } from "@/components/ui/button";
import { t } from "@/shared/i18n";
import { MSG } from "@/shared/i18n/message-keys";
import { Box, Center, Flex } from "../../styled-system/jsx";
import { Header, RecordList } from "./components";
import { TabSwitcher, type TabValue } from "./components/TabSwitcher";
import { useCurrentTab, useRecordActions, useRecords } from "./hooks";

export default function App() {
  const { records, error } = useRecords();
  const { pageInfo } = useCurrentTab();
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
    <Box minH="100vh" bg="bg.canvas" color="fg.default">
      <Header pageInfo={pageInfo()} />

      <Show when={error()}>
        <Box p="4" bg="red.2" color="red.11">
          {t(MSG.COMMON_ERROR)}: {error()?.message}
        </Box>
      </Show>

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
    </Box>
  );
}
