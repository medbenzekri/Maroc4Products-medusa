import clsx from "clsx"
import { useAdminDeleteNote, useAdminUser } from "medusa-react"
import React, { useState } from "react"
import { NoteEvent } from "../../../hooks/use-build-timeline"
import { useIsMe } from "../../../hooks/use-is-me"
import Avatar from "../../atoms/avatar"
import TrashIcon from "../../fundamentals/icons/trash-icon"
import DeletePrompt from "../../organisms/delete-prompt"
import EventActionables from "./event-actionables"
import EventContainer from "./event-container"
import { useTranslation } from "react-i18next"

type NoteProps = {
  event: NoteEvent
}

const Note: React.FC<NoteProps> = ({ event }) => {
  const [showDelete, setShowDelete] = useState(false)
  const { user, isLoading } = useAdminUser(event.authorId)
  const deleteNote = useAdminDeleteNote(event.id)
  const isMe = useIsMe(user?.id)

  if (isLoading || !user) {
    return null
  }

  const name =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email
  const {t} = useTranslation()
  return (
    <>
      <EventContainer
        title={name}
        icon={<Avatar user={user} />}
        time={event.time}
        topNode={
          <EventActionables
            actions={[
              {
                label: t("Delete"),
                icon: <TrashIcon size={20} />,
                onClick: () => setShowDelete(!showDelete),
                variant: "danger",
              },
            ]}
          />
        }
        isFirst={event.first}
      >
        <div
          className={clsx("px-base py-base rounded-2xl", {
            "bg-grey-5": !isMe,
            "bg-violet-5 text-violet-90": isMe,
          })}
        >
          {event.value}
        </div>
      </EventContainer>
      {showDelete && (
        <DeletePrompt
          handleClose={() => setShowDelete(!showDelete)}
          onDelete={async () => deleteNote.mutate(undefined)}
          confirmText={t("Yes, delete")}
          heading={t("Delete note")}
          successText={t("Deleted note")}
        />
      )}
    </>
  )
}

export default Note
