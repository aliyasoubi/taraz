import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useDeletePatient, useSavePatient } from '@/features/patients/api'
import type { PatientDetail } from '@/shared/api/types'
import { errorMessage } from '@/shared/lib/errors'
import { faDigits } from '@/shared/lib/format'
import { t } from '@/shared/lib/i18n'
import { ConfirmSheet, MenuItem, Sheet } from '@/shared/ui'

/** Options for a patient: edit, archive, delete (with confirmation). */
export function PatientMenuSheet({
  patient,
  open,
  confirmingDelete,
  onEdit,
  onAskDelete,
  onClose,
}: {
  patient: PatientDetail
  open: boolean
  confirmingDelete: boolean
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
        navigate('/patients', { replace: true })
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  return (
    <>
      <Sheet open={open} onClose={onClose} title={patient.name}>
        <div className="space-y-2">
          <MenuItem icon={<Pencil className="size-5" />} label={t('patient.editInfo')} onClick={onEdit} />
          <MenuItem
            icon={patient.is_archived ? <ArchiveRestore className="size-5" /> : <Archive className="size-5" />}
            label={patient.is_archived ? t('common.unarchive') : t('patient.archive')}
            onClick={toggleArchive}
          />
          <MenuItem icon={<Trash2 className="size-5" />} label={t('patient.deleteMenu')} danger onClick={onAskDelete} />
        </div>
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
