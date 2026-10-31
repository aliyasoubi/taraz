import { Archive, ArchiveRestore, BadgePercent, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useDeletePatient, useSavePatient } from '@/features/patients/api'
import type { PatientDetail, TxType } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { ConfirmSheet, ListIcon, ListRow, ListSection, Sheet } from '@/shared/ui'

/** The ⋯ menu: a discount, and the patient's own settings. */
export function PatientMenuSheet({
  patient,
  open,
  confirmingDelete,
  onAdd,
  onEdit,
  onAskDelete,
  onClose,
}: {
  patient: PatientDetail
  open: boolean
  confirmingDelete: boolean
  onAdd: (type: TxType) => void
  onEdit: () => void
  onAskDelete: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const save = useSavePatient()
  const remove = useDeletePatient()

  const toggleArchive = () =>
    save.mutate(
      { id: patient.id, data: { is_archived: !patient.is_archived } },
      {
        onSuccess: () => {
          toast.success(patient.is_archived ? t('patient.unarchivedToast') : t('patient.archivedToast'))
          onClose()
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const confirmDelete = () =>
    remove.mutate(patient.id, {
      onSuccess: () => {
        toast.success(t('patient.deleted'))
        navigate('/', { replace: true })
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  return (
    <>
      <Sheet open={open} onClose={onClose} title={patient.name}>
        <ListSection className="mt-1">
          <ListRow
            icon={
              <ListIcon tone="info">
                <BadgePercent />
              </ListIcon>
            }
            title={t('patient.addDiscount')}
            onClick={() => onAdd('discount')}
          />
        </ListSection>
        <ListSection className="mt-6">
          <ListRow
            icon={
              <ListIcon tone="gray">
                <Pencil />
              </ListIcon>
            }
            title={t('patient.editInfo')}
            onClick={onEdit}
          />
          <ListRow
            icon={<ListIcon tone="gray">{patient.is_archived ? <ArchiveRestore /> : <Archive />}</ListIcon>}
            title={patient.is_archived ? t('common.unarchive') : t('patient.archive')}
            onClick={toggleArchive}
          />
        </ListSection>
        <ListSection className="mt-6">
          <ListRow
            icon={
              <ListIcon tone="debt">
                <Trash2 />
              </ListIcon>
            }
            title={t('patient.deleteMenu')}
            destructive
            onClick={onAskDelete}
          />
        </ListSection>
      </Sheet>
      <ConfirmSheet
        open={confirmingDelete}
        onClose={onClose}
        loading={remove.isPending}
        title={t('patient.deleteTitle', { name: patient.name })}
        message={t('patient.deleteMessage', { n: faDigits(patient.tx_count) })}
        onConfirm={confirmDelete}
      />
    </>
  )
}
