/** Staff route uses `CabinetUserDialog` from admin — re-export so imports stay valid */
export { default } from '@/app/admin/management/cabinet-users/components/CabinetUserDialog';
export type {
  CabinetOption,
  CreateCabinetUserFormPayload,
  EditCabinetUserFormPayload,
} from '@/app/admin/management/cabinet-users/components/CabinetUserDialog';
