describe('role', () => {
  it('should return true', () => {
    const roles = {
      allow: {
        publicUser: {
          read: true,
        },
      },
      check: {
        email: 'args.where.email',
        id: 'args.where.id',
      },
    }

    const userRoles = {
      customer: true,
      privatePost: {
        read: true,
      },
    }
  })
})
