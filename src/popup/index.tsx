import { Show, Suspense } from "solid-js";
import { Box, Center } from "../../styled-system/jsx";
import { t } from "../shared/i18n";
import { MSG } from "../shared/i18n/message-keys";
import { Header, RecordList } from "./components";
import { useCurrentTab, useRecordActions, useRecords } from "./hooks";

export default function App() {
  const { records, error } = useRecords();
  const { pageInfo } = useCurrentTab();
  const { updateMemo, deleteRecord, openClipCreation, discoverVodForStreamer } = useRecordActions();

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
            <RecordList
              records={recordsData()}
              onUpdateMemo={updateMemo}
              onDelete={deleteRecord}
              onOpenClip={openClipCreation}
              onFindVod={discoverVodForStreamer}
            />
          )}
        </Show>
      </Suspense>
    </Box>
  );
}
