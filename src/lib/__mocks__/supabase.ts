// Mock completo de Supabase para tests
export const supabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [] }), // se sobrescribe en tests
      })),
    })),
    eq: jest.fn().mockResolvedValue({ data: [] }), // se sobrescribe en tests
  })),
};
