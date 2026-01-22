import { Show, Suspense } from "solid-js";
import { Box, Center } from "../../styled-system/jsx";
import { Header, RecordList } from "./components";
import { useCurrentTab, useRecordActions, useRecords } from "./hooks";

export default function App() {
  const { records, error } = useRecords();
  const { pageInfo } = useCurrentTab();
  const { updateMemo, deleteRecord, openClipCreation } = useRecordActions();

  return (
    <Box minH="100vh" bg="bg.canvas" color="fg.default">
      <Header pageInfo={pageInfo()} />

      <Show when={error()}>
        <Box p="4" bg="red.2" color="red.11">
          Error: {error()?.message}
        </Box>
      </Show>

      <Suspense
        fallback={
          <Center py="8">
            <Box color="fg.muted">Loading...</Box>
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
            />
          )}
        </Show>
      </Suspense>
    </Box>
  );
}
