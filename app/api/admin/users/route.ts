import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseServiceRoleClient();

    // Consultas a las tablas de origen
    const [{ data: employees, error: employeesError }, { data: clients, error: clientsError }, { data: administrators, error: administratorsError }] = await Promise.all([
      supabase.from('employees').select('name, user_id'),
      supabase.from('clients').select('name, user_id'),
      supabase.from('administrators').select('name, user_id'),
    ]);

    if (employeesError) throw employeesError;
    if (clientsError) throw clientsError;
    if (administratorsError) throw administratorsError;

    const allUsers = [
      ...((employees ?? []).map((e: any) => ({ name: e.name, user_id: e.user_id, role: 'employee' as const })) ),
      ...((clients ?? []).map((c: any) => ({ name: c.name, user_id: c.user_id, role: 'client' as const })) ),
      ...((administrators ?? []).map((a: any) => ({ name: a.name, user_id: a.user_id, role: 'administrator' as const })) ),
    ];

  const userIds = allUsers.map(u => u.user_id).filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Obtener datos auth de forma BULK para evitar el patrón N+1 (gran causa de lentitud)
    const usersMap = new Map<string, { email: string; created_at: string; status: 'activo' | 'inactivo' }>();

    // Si la cantidad es razonable (<=1000) intentar un listUsers una sola vez
    if (userIds.length <= 1000) {
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: userIds.length });
      if (!listErr && listData?.users) {
        for (const u of listData.users) {
          if (userIds.includes(u.id)) {
            const status = (u.user_metadata as any)?.status ?? 'activo';
            usersMap.set(u.id, { email: u.email ?? '', created_at: u.created_at ?? '', status });
          }
        }
      } else {
        // Fallback a N+1 sólo si el bulk falla
        const results = await Promise.allSettled(
          userIds.map(async (id) => {
            const { data, error } = await supabase.auth.admin.getUserById(id);
            if (error) throw error;
            const status = (data.user?.user_metadata as any)?.status as string | undefined;
            return { id, email: data.user?.email ?? '', created_at: data.user?.created_at ?? '', status: status ?? 'activo' };
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            usersMap.set(r.value.id, { email: r.value.email, created_at: r.value.created_at, status: (r.value.status as 'activo' | 'inactivo') ?? 'activo' });
          }
        }
      }
    } else {
      // Demasiados IDs: optar por chunking (1000 por página) o fallback rápido
      const CHUNK = 1000;
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const slice = userIds.slice(i, i + CHUNK);
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: CHUNK });
        if (listErr || !listData?.users) break; // fallback silencioso
        for (const u of listData.users) {
          if (slice.includes(u.id)) {
            const status = (u.user_metadata as any)?.status ?? 'activo';
            usersMap.set(u.id, { email: u.email ?? '', created_at: u.created_at ?? '', status });
          }
        }
      }
      // Completar faltantes (si alguno no vino) con llamadas directas mínimas
      const missing = userIds.filter(id => !usersMap.has(id));
      if (missing.length) {
        const results = await Promise.allSettled(
          missing.map(async (id) => {
            const { data, error } = await supabase.auth.admin.getUserById(id);
            if (error) throw error;
            const status = (data.user?.user_metadata as any)?.status as string | undefined;
            return { id, email: data.user?.email ?? '', created_at: data.user?.created_at ?? '', status: status ?? 'activo' };
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            usersMap.set(r.value.id, { email: r.value.email, created_at: r.value.created_at, status: (r.value.status as 'activo' | 'inactivo') ?? 'activo' });
          }
        }
      }
    }

    // Traer user_level desde userlevel para diferenciar China/Vzla
    const { data: levelsData, error: levelsErr } = await supabase
      .from('userlevel')
      .select('id, user_level')
      .in('id', userIds);
    if (levelsErr) {
      // No bloquear; simplemente seguimos sin user_level
      // console.warn('userlevel fetch failed:', levelsErr.message);
    }
    const levelsMap = new Map<string, string>();
    (levelsData ?? []).forEach((row: any) => {
      levelsMap.set(row.id as string, (row.user_level as string) ?? '');
    });

  const result = allUsers.map(u => ({
      id: u.user_id as string,
      name: u.name as string,
      role: u.role,
    email: usersMap.get(u.user_id)?.email ?? '',
    created_at: usersMap.get(u.user_id)?.created_at ?? '',
    status: usersMap.get(u.user_id)?.status ?? 'activo',
    user_level: levelsMap.get(u.user_id) ?? undefined,
  }))
  // Excluir inactivos por defecto
  .filter((u) => (u.status ?? 'activo') !== 'inactivo');

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/admin/users error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

type DbRole = 'employee' | 'client' | 'administrator';

function getTableByRole(role: DbRole): 'employees' | 'clients' | 'administrators' {
  switch (role) {
    case 'employee':
      return 'employees';
    case 'client':
      return 'clients';
    case 'administrator':
      return 'administrators';
  }
}

async function findCurrentRole(supabase: ReturnType<typeof getSupabaseServiceRoleClient>, userId: string): Promise<DbRole | null> {
  const [emp, cli, adm] = await Promise.all([
    supabase.from('employees').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('clients').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('administrators').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (emp.data && !emp.error) return 'employee';
  if (cli.data && !cli.error) return 'client';
  if (adm.data && !adm.error) return 'administrator';
  return null;
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const body = await req.json();
  const { id, fullName, email, role, status, prevRole, userLevel, newPassword }: { id: string; fullName?: string; email?: string; role?: DbRole; status?: 'activo' | 'inactivo'; prevRole?: DbRole; userLevel?: string; newPassword?: string } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    // Determine current role if not provided
    const currentRole: DbRole | null = prevRole ?? (await findCurrentRole(supabase, id));

    // Move or update name
    if (role) {
      if (currentRole && role !== currentRole) {
        // Move: delete from old, insert into new
        const oldTable = getTableByRole(currentRole);
        const newTable = getTableByRole(role);
        const { error: delErr } = await supabase.from(oldTable).delete().eq('user_id', id);
        if (delErr) throw delErr;
        const insertPayload: any = { user_id: id };
        if (fullName) insertPayload.name = fullName;
        const { error: insErr } = await supabase.from(newTable).insert(insertPayload);
        if (insErr) throw insErr;
      } else if (currentRole) {
        // Update name in place if provided
        if (typeof fullName === 'string' && fullName.length > 0) {
          const table = getTableByRole(currentRole);
          const { error: updErr } = await supabase.from(table).update({ name: fullName }).eq('user_id', id);
          if (updErr) throw updErr;
        }
      } else if (!currentRole && role) {
        // Not in any table yet, insert into provided role
        const table = getTableByRole(role);
        const insertPayload: any = { user_id: id };
        if (fullName) insertPayload.name = fullName;
        const { error: insErr } = await supabase.from(table).insert(insertPayload);
        if (insErr) throw insErr;
      }
    } else if (currentRole && typeof fullName === 'string' && fullName.length > 0) {
      const table = getTableByRole(currentRole);
      const { error: updErr } = await supabase.from(table).update({ name: fullName }).eq('user_id', id);
      if (updErr) throw updErr;
    }

    // Update auth user email and/or status in user_metadata
    if (email || status || newPassword) {
      if (email && email.length > 50) {
        return NextResponse.json({ error: 'El email no debe exceder 50 caracteres.' }, { status: 400 });
      }
      if (newPassword && newPassword.length > 50) {
        return NextResponse.json({ error: 'La contraseña no puede superar 50 caracteres.' }, { status: 400 });
      }
      const meta: Record<string, any> = {};
      if (status) meta.status = status;
      const attrs: any = {};
      if (email) attrs.email = email;
      if (newPassword && newPassword.trim().length > 0) attrs.password = newPassword.trim();
      if (Object.keys(meta).length > 0) attrs.user_metadata = meta;
      if (Object.keys(attrs).length > 0) {
        const { error: updAuthErr } = await supabase.auth.admin.updateUserById(id, attrs);
        if (updAuthErr) throw updAuthErr;
      }
    }

    // Update userlevel if provided, or infer from role changes
    if (userLevel) {
      const { error: levelErr } = await supabase
        .from('userlevel')
        .upsert({ id, user_level: userLevel }, { onConflict: 'id' });
      if (levelErr) {
        // No bloquear por fallo en userlevel
        // console.warn('userlevel upsert failed (PATCH):', levelErr.message);
      }
    } else if (role) {
      // If changing to client/admin and no explicit userLevel provided, set a sane default
      const defaultMap: Record<DbRole, string> = { client: 'Client', administrator: 'Admin', employee: 'Vzla' };
      const { error: levelErr } = await supabase
        .from('userlevel')
        .upsert({ id, user_level: defaultMap[role] }, { onConflict: 'id' });
      if (levelErr) {
        // console.warn('userlevel upsert (default) failed:', levelErr.message);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('PATCH /api/admin/users error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const body = await req.json();
    const { id, hard }: { id: string; hard?: boolean } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    if (hard) {
      // Attempt to remove role rows; note: this can fail due to FK constraints (e.g., orders -> clients).
      const delEmployees = await supabase.from('employees').delete().eq('user_id', id);
      if (delEmployees.error) {
        return NextResponse.json({ error: delEmployees.error.message }, { status: 409 });
      }
      const delAdmins = await supabase.from('administrators').delete().eq('user_id', id);
      if (delAdmins.error) {
        return NextResponse.json({ error: delAdmins.error.message }, { status: 409 });
      }
      const delClients = await supabase.from('clients').delete().eq('user_id', id);
      if (delClients.error) {
        // Likely FK violation with orders. Abort and inform client.
        return NextResponse.json({ error: 'No se puede eliminar el cliente porque existen pedidos relacionados. Considera marcarlo como inactivo o ajustar la FK (SET NULL/CASCADE).' }, { status: 409 });
      }
      // Delete auth user
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(id);
      if (delAuthErr) return NextResponse.json({ error: delAuthErr.message }, { status: 409 });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Soft delete: DO NOT remove role rows to keep referential integrity.
    const { error: updMetaErr } = await supabase.auth.admin.updateUserById(id, { user_metadata: { status: 'inactivo' } });
    if (updMetaErr) return NextResponse.json({ error: updMetaErr.message }, { status: 409 });
    return NextResponse.json({ ok: true, softDeleted: true }, { status: 200 });
  } catch (err: any) {
    console.error('DELETE /api/admin/users error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const body = await req.json();
    const { fullName, email, role, userLevel, password }: { fullName?: string; email?: string; role?: DbRole; userLevel?: string; password?: string } = body || {};
    if (!fullName || !email || !role) {
      return NextResponse.json({ error: 'fullName, email y role son requeridos' }, { status: 400 });
    }
    if (password && password.length > 50) {
      return NextResponse.json({ error: 'La contraseña no puede superar 50 caracteres.' }, { status: 400 });
    }
    if (email && email.length > 50) {
      return NextResponse.json({ error: 'El email no debe exceder 50 caracteres.' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || undefined;

    let newUser: any = null;
    if (password && password.trim().length > 0) {
      // Crear usuario con contraseña definida por el admin
      const { data, error: createErr } = await (supabase as any).auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, status: 'activo' },
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
      newUser = data?.user;
    } else {
      // Crear usuario por invitación (el usuario definirá su contraseña al aceptar)
      const { data: invite, error: inviteErr } = await (supabase as any).auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, status: 'activo' },
        redirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
      });
      if (inviteErr) {
        return NextResponse.json({ error: inviteErr.message }, { status: 400 });
      }
      newUser = invite?.user;
    }
    if (!newUser?.id) {
      return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
    }

    const userId = newUser.id as string;

    // Insertar en tabla de rol
    const table = getTableByRole(role);
    const insertPayload: any = { user_id: userId, name: fullName };
    const { error: roleInsErr } = await supabase.from(table).insert(insertPayload);
    if (roleInsErr) {
      return NextResponse.json({ error: roleInsErr.message }, { status: 400 });
    }

    // Upsert en userlevel para mantener coherencia con el flujo de registro
    // Preferir el userLevel enviado por el UI (China/Vzla/Client/Admin)
    const fallbackLevelMap: Record<DbRole, string> = { client: 'Client', employee: 'Vzla', administrator: 'Admin' };
    const levelToSet = (userLevel && userLevel.trim()) ? userLevel : fallbackLevelMap[role];
    const { error: levelErr } = await supabase
      .from('userlevel')
      .upsert({ id: userId, user_level: levelToSet }, { onConflict: 'id' });
    if (levelErr) {
      // No bloquear por fallo en userlevel, pero informar
      // console.warn('userlevel upsert failed:', levelErr.message);
    }

    // Responder en el mismo formato que GET
    return NextResponse.json({
      id: userId,
      name: fullName,
      role,
      email,
      created_at: newUser.created_at ?? '',
  status: 'activo',
  user_level: levelToSet,
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/admin/users error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
