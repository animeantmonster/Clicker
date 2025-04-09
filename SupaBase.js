document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('SupaBase.js loaded');
        const { createClient } = window.supabase || {};
        if (!createClient) throw new Error('Supabase library not loaded');

        const supabaseUrl = 'https://usfanjpbjfjrfebrcyyj.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZmFuanBiamZqcmZlYnJjeXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMTcyMTMsImV4cCI6MjA1OTU5MzIxM30.F9jdgsvpCGHhXazVHAZ19As2eeZVcEUpN8qOCVo42i8';
        const supabase = createClient(supabaseUrl, supabaseKey);

        async function registerUser(nickname, password) {
            console.log('Attempting to register:', nickname);
            const { data, error } = await supabase
                .from('players')
                .insert([{
                    nickname,
                    password,
                    nlick: 0,
                    zlick: 0,
                    purchased_items: [],
                    purchased_themes: [],
                    current_theme: 'default',
                    purchased_boosts: [],
                    trade_count: 0,
                    successful_trades: 0,
                    failed_trades: 0,
                    complaints: 0,
                    approvals: 0,
                    trade_banned: false,
                    account_banned: false,
                    total_trades: 0,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                    level: 1,
                    experience: 0,
                    currency_spent: 0,
                    achievements: []
                }])
                .select();
            if (error) throw error;
            return data[0];
        }

        async function deleteUser(nickname) {
            console.log('Attempting to delete:', nickname);
            const { data: playerData, error: fetchError } = await supabase
                .from('players')
                .select('created_at, password')
                .eq('nickname', nickname)
                .single();
            if (fetchError) throw fetchError;

            const { error: insertError } = await supabase
                .from('deleted_accounts')
                .insert({
                    nickname: nickname,
                    password: playerData.password,
                    reason: 'self_deleted',
                    created_at: playerData.created_at,
                    deleted_at: new Date().toISOString()
                });
            if (insertError) throw insertError;

            const { data, error } = await supabase
                .from('players')
                .delete()
                .eq('nickname', nickname);
            if (error) throw error;
            return data;
        }

        async function updateNlick(nickname, nlickValue) {
            console.log('Updating Nlick for:', nickname, 'to', nlickValue);
            const { data, error } = await supabase
                .from('players')
                .update({ nlick: nlickValue })
                .eq('nickname', nickname);
            if (error) throw error;
            return { data, newNlick: nlickValue };
        }

        const channel = supabase
            .channel('players-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, (payload) => {
                console.log('New player registered:', payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, (payload) => {
                console.log('Player updated:', payload.new);
                if (window.onNlickUpdate) {
                    window.onNlickUpdate(payload.new.nickname, payload.new.nlick || 0);
                }
            })
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        window.supabase = supabase;
        window.registerUser = registerUser;
        window.deleteUser = deleteUser;
        window.updateNlick = updateNlick;
        window.supabaseClient = supabase;
    } catch (error) {
        console.error('SupaBase.js error:', error.message);
    }
});
