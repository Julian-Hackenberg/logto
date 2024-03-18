import { OrganizationInvitationStatus } from '@logto/schemas';
import { format } from 'date-fns';
import { useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import Delete from '@/assets/icons/delete.svg';
import Invite from '@/assets/icons/invitation.svg';
import More from '@/assets/icons/more.svg';
import Plus from '@/assets/icons/plus.svg';
import Redo from '@/assets/icons/redo.svg';
import UsersEmptyDark from '@/assets/images/users-empty-dark.svg';
import UsersEmpty from '@/assets/images/users-empty.svg';
import { useAuthedCloudApi } from '@/cloud/hooks/use-cloud-api';
import { type TenantInvitationResponse } from '@/cloud/types/router';
import { RoleOption } from '@/components/OrganizationRolesSelect';
import { TenantsContext } from '@/contexts/TenantsProvider';
import ActionMenu, { ActionMenuItem } from '@/ds-components/ActionMenu';
import Button from '@/ds-components/Button';
import DynamicT from '@/ds-components/DynamicT';
import Table from '@/ds-components/Table';
import TablePlaceholder from '@/ds-components/Table/TablePlaceholder';
import Tag, { type Props as TagProps } from '@/ds-components/Tag';
import { type RequestError } from '@/hooks/use-api';
import { useConfirmModal } from '@/hooks/use-confirm-modal';

import InviteMemberModal from '../InviteMemberModal';

const convertInvitationStatusToTagStatus = (
  status: OrganizationInvitationStatus
): TagProps['status'] => {
  switch (status) {
    case OrganizationInvitationStatus.Pending: {
      return 'alert';
    }
    case OrganizationInvitationStatus.Accepted: {
      return 'success';
    }
    case OrganizationInvitationStatus.Revoked: {
      return 'error';
    }
    default: {
      return 'info';
    }
  }
};

function Invitations() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console.tenant_members' });
  const cloudApi = useAuthedCloudApi();
  const { currentTenantId } = useContext(TenantsContext);

  const { data, error, isLoading, mutate } = useSWR<TenantInvitationResponse[], RequestError>(
    `api/tenant/${currentTenantId}/invitations`,
    async () =>
      cloudApi.get('/api/tenants/:tenantId/invitations', { params: { tenantId: currentTenantId } })
  );

  const [showInviteModal, setShowInviteModal] = useState(false);
  const { show } = useConfirmModal();

  const handleRevoke = async (invitationId: string) => {
    const [result] = await show({
      ModalContent: t('revoke_invitation_confirm'),
      confirmButtonText: 'general.confirm',
    });

    if (!result) {
      return;
    }

    await cloudApi.patch(`/api/tenants/:tenantId/invitations/:invitationId/status`, {
      params: { tenantId: currentTenantId, invitationId },
      body: { status: OrganizationInvitationStatus.Revoked },
    });
    void mutate();
    toast.success(t('messages.invitation_revoked'));
  };

  const handleDelete = async (invitationId: string) => {
    const [result] = await show({
      ModalContent: t('delete_user_confirm'),
      confirmButtonText: 'general.delete',
    });

    if (!result) {
      return;
    }

    await cloudApi.delete(`/api/tenants/:tenantId/invitations/:invitationId`, {
      params: { tenantId: currentTenantId, invitationId },
    });
    void mutate();
    toast.success(t('messages.invitation_deleted'));
  };

  return (
    <>
      <Table
        isRowHoverEffectDisabled
        placeholder={
          <TablePlaceholder
            image={<UsersEmpty />}
            imageDark={<UsersEmptyDark />}
            title="tenant_members.invitation_empty_placeholder.title"
            description="tenant_members.invitation_empty_placeholder.description"
            action={
              <Button
                title="tenant_members.invite_member"
                type="primary"
                size="large"
                icon={<Plus />}
                onClick={() => {
                  setShowInviteModal(true);
                }}
              />
            }
          />
        }
        isLoading={isLoading}
        errorMessage={error?.toString()}
        rowGroups={[{ key: 'data', data }]}
        columns={[
          {
            dataIndex: 'user',
            colSpan: 4,
            title: t('user'),
            render: ({ invitee }) => <span>{invitee}</span>,
          },
          {
            dataIndex: 'roles',
            colSpan: 4,
            title: t('roles'),
            render: ({ organizationRoles }) => {
              if (organizationRoles.length === 0) {
                return '-';
              }

              return organizationRoles.map(({ id, name }) => (
                <Tag key={id} variant="cell">
                  <RoleOption value={id} title={name} />
                </Tag>
              ));
            },
          },
          {
            dataIndex: 'status',
            colSpan: 4,
            title: t('invitation_status'),
            render: ({ status }) => (
              <Tag type="state" status={convertInvitationStatusToTagStatus(status)}>
                {status}
              </Tag>
            ),
          },
          {
            dataIndex: 'sentAt',
            colSpan: 4,
            title: t('invitation_sent'),
            render: ({ createdAt }) => <span>{format(createdAt, 'MMM Lo, yyyy')}</span>,
          },
          {
            dataIndex: 'expiresAt',
            colSpan: 4,
            title: t('expiration_date'),
            render: ({ expiresAt }) => <span>{format(expiresAt, 'MMM Lo, yyyy')}</span>,
          },
          {
            dataIndex: 'actions',
            title: null,
            render: ({ id, status }) => (
              <ActionMenu
                icon={<More />}
                iconSize="small"
                title={<DynamicT forKey="general.more_options" />}
              >
                {status !== OrganizationInvitationStatus.Accepted && (
                  <ActionMenuItem
                    icon={<Invite />}
                    onClick={async () => {
                      await cloudApi.post(
                        '/api/tenants/:tenantId/invitations/:invitationId/message',
                        {
                          params: { tenantId: currentTenantId, invitationId: id },
                        }
                      );
                      toast.success(t('messages.invitation_sent'));
                    }}
                  >
                    {t('menu_options.resend_invite')}
                  </ActionMenuItem>
                )}
                {status === OrganizationInvitationStatus.Pending && (
                  <ActionMenuItem
                    icon={<Redo />}
                    type="danger"
                    onClick={() => {
                      void handleRevoke(id);
                    }}
                  >
                    {t('menu_options.revoke')}
                  </ActionMenuItem>
                )}
                {status !== OrganizationInvitationStatus.Pending && (
                  <ActionMenuItem
                    icon={<Delete />}
                    type="danger"
                    onClick={() => {
                      void handleDelete(id);
                    }}
                  >
                    {t('menu_options.delete_invitation_record')}
                  </ActionMenuItem>
                )}
              </ActionMenu>
            ),
          },
        ]}
        rowIndexKey="id"
      />
      {showInviteModal && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            void mutate();
          }}
        />
      )}
    </>
  );
}

export default Invitations;
